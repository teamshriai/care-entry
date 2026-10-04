import { useCallback, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { isFlowName, readFlow, withoutFlow } from './flowParams'
import type { FlowLocationState } from './flowParams'
import { FLOWS } from './registry'

/**
 * Renders whichever flow the URL names, over whatever page is showing.
 * Mounted once, in AppLayout.
 */
export function FlowHost() {
  const location = useLocation()
  const navigate = useNavigate()
  const active = readFlow(location.search)
  const Flow = active && isFlowName(active.name) ? FLOWS[active.name] : undefined

  // A flow's acknowledgement timer and the Escape key can both ask to close
  // in the same moment; only the first may step history back.
  const closingKey = useRef<string | null>(null)

  const close = useCallback(() => {
    if (!readFlow(location.search) || closingKey.current === location.key) return
    closingKey.current = location.key
    if ((location.state as FlowLocationState | null)?.flowPushed) {
      navigate(-1)
    } else {
      // Opened cold (a deep link or an old route's redirect): there is no
      // entry to step back to, so drop the flow from the address instead.
      navigate({ pathname: location.pathname, search: withoutFlow(location.search) }, { replace: true })
    }
  }, [location, navigate])

  const unknown = Boolean(active) && !Flow
  useEffect(() => {
    if (unknown) navigate({ pathname: location.pathname, search: withoutFlow(location.search) }, { replace: true })
  }, [unknown, location.pathname, location.search, navigate])

  if (!active || !Flow) return null
  return <Flow key={active.key} params={active.params} onClose={close} />
}
