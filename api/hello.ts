import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.json({ 
    message: 'Hello from Vercel!', 
    timestamp: new Date().toISOString(),
    method: req.method
  });
}