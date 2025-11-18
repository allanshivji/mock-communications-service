import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { initiateCall } from '../services/callService';
import { findCallById } from '../models/Call';
import { CreateCallRequest } from '../types';

const router = Router();

// POST - Creating a new call
router.post('/', authenticate, rateLimiter, async (req: Request, res: Response) => {
  try {
    const { from, to, metadata } = req.body;
    
    // Validate required fields
    if (!from || !to) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required fields: from, to'
      });
      return;
    }
    
    // Validate phone number format (basic validation)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(from) || !phoneRegex.test(to)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid phone number format. Use E.164 format (e.g., +1234567890)'
      });
      return;
    }
    
    const apiKey = req.apiKey!;
    
    // Create call request object
    const callRequest: CreateCallRequest = {
      from,
      to,
      metadata: metadata || {}
    };
    
    // Initiate the call
    const call = await initiateCall(callRequest, apiKey);
    
    // WebSocket URL
    const wsProtocol = req.protocol === 'https' ? 'wss' : 'ws';
    const wsUrl = `${wsProtocol}://${req.get('host')}/ws?call_id=${call.id}`;
    
    return res.status(201).json({
      call_id: call.id,
      status: call.status,
      websocket_url: wsUrl,
      from: call.from_number,
      to: call.to_number,
      created_at: call.created_at
    });
    
  } catch (error) {
    console.error('Error creating call:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create call'
    });
  }
});

// GET /calls/:id - Getting call status
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid call ID format'
      });
      return;
    }
    
    // Find call
    const call = await findCallById(id);
    
    if (!call) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Call not found'
      });
      return;
    }
    
    return res.json({
      call_id: call.id,
      status: call.status,
      from: call.from_number,
      to: call.to_number,
      metadata: call.metadata,
      recording_url: call.recording_url,
      created_at: call.created_at,
      updated_at: call.updated_at
    });
    
  } catch (error) {
    console.error('Error fetching call:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch call'
    });
  }
});

export default router;