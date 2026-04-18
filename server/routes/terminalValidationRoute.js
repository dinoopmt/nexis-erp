/**
 * Terminal Validation API
 * Check for duplicate Terminal IDs and prevent cloning
 */

export const validateTerminalIdRoute = (app, db) => {
  /**
   * POST /api/v1/terminals/validate-id
   * Validate Terminal ID is unique before saving
   */
  app.post('/api/v1/terminals/validate-id', async (req, res) => {
    try {
      const { terminalId, excludeId } = req.body

      if (!terminalId) {
        return res.status(400).json({
          success: false,
          message: 'Terminal ID is required',
        })
      }

      // Check if Terminal ID already exists
      const existingTerminal = await db.collection('terminals').findOne({
        terminalId: terminalId,
        _id: { $ne: excludeId }, // Exclude current terminal if editing
      })

      if (existingTerminal) {
        return res.status(409).json({
          success: false,
          message: 'Terminal ID already exists',
          code: 'DUPLICATE_TERMINAL_ID',
          details: {
            existingTerminal: existingTerminal.terminalName,
            createdAt: existingTerminal.createdAt,
          },
        })
      }

      return res.json({
        success: true,
        message: 'Terminal ID is available',
        terminalId: terminalId,
      })
    } catch (error) {
      console.error('❌ Error validating terminal ID:', error)
      res.status(500).json({
        success: false,
        message: 'Error validating terminal ID',
        error: error.message,
      })
    }
  })

  /**
   * GET /api/v1/terminals/device-info
   * Get current device terminals count
   */
  app.get('/api/v1/terminals/device-info', async (req, res) => {
    try {
      const { deviceFingerprint } = req.query

      if (!deviceFingerprint) {
        return res.status(400).json({
          success: false,
          message: 'Device fingerprint is required',
        })
      }

      // Find all terminals for this device
      const deviceTerminals = await db.collection('terminals')
        .find({
          terminalId: {
            $regex: `^TERM-${deviceFingerprint}`,
          },
        })
        .toArray()

      return res.json({
        success: true,
        deviceFingerprint: deviceFingerprint,
        terminalCount: deviceTerminals.length,
        terminals: deviceTerminals.map(t => ({
          _id: t._id,
          terminalId: t.terminalId,
          terminalName: t.terminalName,
          terminalType: t.terminalType,
          createdAt: t.createdAt,
        })),
        nextTerminalNumber: deviceTerminals.length + 1,
      })
    } catch (error) {
      console.error('❌ Error getting device info:', error)
      res.status(500).json({
        success: false,
        message: 'Error getting device info',
        error: error.message,
      })
    }
  })

  console.log('✅ Terminal validation routes registered')
}

export default validateTerminalIdRoute
