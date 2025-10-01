import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface UsageLimits {
  documents: number
  research: number
  chat: number // -1 = illimitato
}

const PLAN_LIMITS: Record<string, UsageLimits> = {
  free: { documents: 5, research: 3, chat: 50 },
  starter: { documents: 50, research: 20, chat: 500 },
  professional: { documents: -1, research: -1, chat: -1 },
  enterprise: { documents: -1, research: -1, chat: -1 }
}

export class LimitsEnforcer {
  async checkDocumentLimit(userId: string): Promise<{ allowed: boolean, remaining: number, error?: string }> {
    const { plan, limit } = await this.getPlanLimit(userId, 'documents')
    
    if (limit === -1) {
      return { allowed: true, remaining: -1 }
    }

    const used = await this.getMonthlyUsage(userId, 'generated_documents')
    const remaining = Math.max(0, limit - used)

    if (used >= limit) {
      return {
        allowed: false,
        remaining: 0,
        error: `Limite documenti raggiunto (${limit}/mese). Upgrade al piano Professional per documenti illimitati.`
      }
    }

    // Soft warning at 80%
    if (used >= limit * 0.8) {
      console.warn(`User ${userId} at ${Math.round(used/limit * 100)}% document usage`)
    }

    return { allowed: true, remaining }
  }

  async checkResearchLimit(userId: string): Promise<{ allowed: boolean, remaining: number, error?: string }> {
    const { plan, limit } = await this.getPlanLimit(userId, 'research')
    
    if (limit === -1) {
      return { allowed: true, remaining: -1 }
    }

    const used = await this.getMonthlyUsage(userId, 'research_history')
    const remaining = Math.max(0, limit - used)

    if (used >= limit) {
      return {
        allowed: false,
        remaining: 0,
        error: `Limite ricerche raggiunto (${limit}/mese). Upgrade necessario.`
      }
    }

    return { allowed: true, remaining }
  }

  async checkChatLimit(userId: string): Promise<{ allowed: boolean, remaining: number, error?: string }> {
    const { plan, limit } = await this.getPlanLimit(userId, 'chat')
    
    if (limit === -1) {
      return { allowed: true, remaining: -1 }
    }

    // Chat uses simple counter in user metadata
    const { data: profile } = await supabase
      .from('studio_profiles')
      .select('metadata')
      .eq('user_id', userId)
      .single()

    const chatCount = (profile?.metadata as any)?.chat_count_this_month || 0
    const remaining = Math.max(0, limit - chatCount)

    if (chatCount >= limit) {
      return {
        allowed: false,
        remaining: 0,
        error: `Limite chat raggiunto (${limit}/mese). Upgrade necessario.`
      }
    }

    return { allowed: true, remaining }
  }

  async incrementChatCount(userId: string) {
    const { data: profile } = await supabase
      .from('studio_profiles')
      .select('metadata')
      .eq('user_id', userId)
      .single()

    const currentCount = (profile?.metadata as any)?.chat_count_this_month || 0
    const lastReset = (profile?.metadata as any)?.chat_count_last_reset

    // Reset monthly counter if needed
    const now = new Date()
    const lastResetDate = lastReset ? new Date(lastReset) : null
    const shouldReset = !lastResetDate || 
                       (now.getMonth() !== lastResetDate.getMonth() || 
                        now.getFullYear() !== lastResetDate.getFullYear())

    await supabase
      .from('studio_profiles')
      .update({
        metadata: {
          ...(profile?.metadata || {}),
          chat_count_this_month: shouldReset ? 1 : currentCount + 1,
          chat_count_last_reset: shouldReset ? now.toISOString() : lastReset
        }
      })
      .eq('user_id', userId)
  }

  private async getPlanLimit(userId: string, type: keyof UsageLimits): Promise<{ plan: string, limit: number }> {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan_name, status')
      .eq('user_id', userId)
      .single()

    const plan = subscription?.plan_name || 'free'
    const status = subscription?.status

    // If subscription expired/canceled, downgrade to free
    if (status === 'canceled' || status === 'past_due') {
      return { plan: 'free', limit: PLAN_LIMITS.free[type] }
    }

    return { plan, limit: PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS]?.[type] || PLAN_LIMITS.free[type] }
  }

  private async getMonthlyUsage(userId: string, table: string): Promise<number> {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString())

    return count || 0
  }
}

export const limitsEnforcer = new LimitsEnforcer()