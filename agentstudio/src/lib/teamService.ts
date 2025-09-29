import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export class TeamService {
  async getUserTeams(userId: string) {
    // Get teams where user is member
    const { data: memberships } = await supabase
      .from('team_members')
      .select('team_id, role')
      .eq('user_id', userId)

    if (!memberships || memberships.length === 0) return []

    const teamIds = memberships.map(m => m.team_id)

    // Get team details
    const { data: teams } = await supabase
      .from('teams')
      .select('*')
      .in('id', teamIds)

    if (!teams) return []

    // Enrich with subscription data
    const enrichedTeams = await Promise.all(
      teams.map(async team => {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('plan_name, status')
          .eq('id', team.subscription_id)
          .single()

        return {
          ...team,
          team_members: memberships.filter(m => m.team_id === team.id),
          subscriptions: sub || { plan_name: 'enterprise', status: 'active' }
        }
      })
    )

    return enrichedTeams
  }

  async getTeamMembers(teamId: string) {
    const { data: members, error } = await supabase
      .from('team_members')
      .select('id, user_id, role, permissions, joined_at')
      .eq('team_id', teamId)
      .order('role')

    if (error) {
      console.error('Error loading team members:', error)
      throw error
    }

    if (!members || members.length === 0) return []

    // Get user details using Admin API
    const enrichedMembers = await Promise.all(
      members.map(async member => {
        try {
          const { data: userData, error: userError } = await supabase.auth.admin.getUserById(member.user_id)
          
          if (userError || !userData.user) {
            console.error('Error loading user:', member.user_id, userError)
            return {
              ...member,
              users: {
                email: 'Email non disponibile',
                raw_user_meta_data: {}
              }
            }
          }

          return {
            ...member,
            users: {
              email: userData.user.email || 'Email non disponibile',
              raw_user_meta_data: userData.user.user_metadata || {}
            }
          }
        } catch (err) {
          console.error('Exception loading user:', member.user_id, err)
          return {
            ...member,
            users: {
              email: 'Email non disponibile',
              raw_user_meta_data: {}
            }
          }
        }
      })
    )

    return enrichedMembers
  }

  async inviteTeamMember(teamId: string, email: string, role: string, invitedBy: string) {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const { data: invitation, error } = await supabase
      .from('team_invitations')
      .insert({
        team_id: teamId,
        email: email.toLowerCase(),
        role,
        invited_by: invitedBy,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return invitation
  }

  async createTeamForUser(userId: string, subscriptionId: string, teamName: string) {
    try {
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: teamName,
          owner_id: userId,
          subscription_id: subscriptionId,
          plan_type: 'professional'
        })
        .select()
        .single()

      if (teamError) throw teamError

      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: team.id,
          user_id: userId,
          role: 'owner',
          permissions: {
            documents: true,
            research: true,
            chat: true,
            team_management: true
          }
        })

      if (memberError) throw memberError

      const { error: subError } = await supabase
        .from('subscriptions')
        .update({ team_id: team.id })
        .eq('id', subscriptionId)

      if (subError) throw subError

      return team
    } catch (error) {
      console.error('Error creating team:', error)
      throw error
    }
  }
}