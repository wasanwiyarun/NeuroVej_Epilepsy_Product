export const FOREGROUND_OBSERVATION_BRIGHT_TIME_MS = 150000

const DISPLAY_API_SUCCESS = 0

export function createPageBrightLifetime({
  setPageBrightTime,
  resetPageBrightTime,
  log = () => {},
}) {
  let requestAttempted = false
  let requestSucceeded = false
  let cleanupAttempted = false
  let cleanupSucceeded = false

  function report(message) {
    try {
      log(message)
    } catch (error) {
      // A diagnostic sink must not interrupt display-state cleanup.
    }
  }

  return {
    request() {
      if (cleanupAttempted) {
        return false
      }

      if (requestAttempted) {
        return requestSucceeded
      }

      requestAttempted = true

      try {
        requestSucceeded =
          setPageBrightTime({
            brightTime: FOREGROUND_OBSERVATION_BRIGHT_TIME_MS,
          }) === DISPLAY_API_SUCCESS
      } catch (error) {
        requestSucceeded = false
      }

      if (!requestSucceeded) {
        report('Finite page-bright request failed')
      }

      return requestSucceeded
    },

    cleanup() {
      if (cleanupAttempted) {
        return cleanupSucceeded
      }

      cleanupAttempted = true

      try {
        cleanupSucceeded = resetPageBrightTime() === DISPLAY_API_SUCCESS
      } catch (error) {
        cleanupSucceeded = false
      }

      if (!cleanupSucceeded) {
        report('Page-bright reset failed')
      }

      return cleanupSucceeded
    },
  }
}
