import FinancialAgentApp from './components/financialAgent/FinancialAgentApp'

type Props = {
  onGoUpload: () => void
  onGoReports: () => void
  onGoChat: () => void
}

/** Full-screen research assistant (Claude + proxied Yahoo / SEC / Ninjas). See `.env.example`. */
export default function AiFinancialAgentView({ onGoUpload, onGoReports, onGoChat }: Props) {
  return (
    <div className="min-h-0 max-w-[1200px]">
      <FinancialAgentApp onGoUpload={onGoUpload} onGoReports={onGoReports} onGoChat={onGoChat} />
    </div>
  )
}
