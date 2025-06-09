/**
 * Socket Service
 * Provides a socket.io client connection to the server for real-time updates
 * This is a compatibility wrapper for the new socket service
 */
import { socketService } from '../api/services/socket.service';

// Re-export the new socket service for backward compatibility
export default socketService;
export { socketService };
