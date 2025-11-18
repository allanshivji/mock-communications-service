import { Request, Response, NextFunction } from 'express';

//Express Request type to include apiKey
declare global {
  namespace Express {
    interface Request {
      apiKey?: string;
    }
  }
}

// Get API keys from env
const getValidApiKeys = (): Set<string> => {
  const keys = process.env.VALID_API_KEYS || '';
  return new Set(keys.split(',').map(k => k.trim()).filter(k => k.length > 0));
};

//Authentication middleware
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing Authorization header'
    });
    return;
  }
  
  //Check if it has a Bearer token
  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid Authorization format. Use: Bearer <API_KEY>'
    });
    return;
  }
  
  //Extract the API key
  const apiKey = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  // Validate API key
  const validKeys = getValidApiKeys();
  
  if (!validKeys.has(apiKey)) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid API key'
    });
    return;
  }
  
  // Attach API key to request for use in other middleware/routes
  req.apiKey = apiKey;
  
  next();
};