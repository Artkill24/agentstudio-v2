interface ChatAgentProps {
  userEmail: string
  onClose?: () => void
}

export default function ChatAgent({ userEmail, onClose }: ChatAgentProps) {
  const [isOpen, setIsOpen] = useState(!onClose) // Se c'è onClose, apri subito

  const handleClose = () => {
    setIsOpen(false)
    onClose?.()
  }

  // Nel bottone X, cambia onClick={() => setIsOpen(false)} con onClick={handleClose}
  // Nel bottone floating, aggiungi condizione: {!onClose && (