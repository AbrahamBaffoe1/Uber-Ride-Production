import { apiClient, ApiResponse } from '../client';

/**
 * Service for support and help-related functionality
 */
export default {
  /**
   * Submit a new support ticket
   * @param ticketData Support ticket data
   * @returns Promise with API response
   */
  submitTicket: (ticketData: {
    subject: string;
    category: string;
    description: string;
    attachments?: any[];
  }): Promise<ApiResponse> => {
    return apiClient.post('/passenger/support/ticket', ticketData);
  },

  /**
   * Get user's support tickets
   * @returns Promise with API response containing support tickets
   */
  getTickets: (): Promise<ApiResponse> => {
    return apiClient.get('/passenger/support/tickets');
  },

  /**
   * Get a specific support ticket by ID
   * @param ticketId Ticket ID
   * @returns Promise with API response containing ticket details
   */
  getTicketById: (ticketId: string): Promise<ApiResponse> => {
    return apiClient.get(`/passenger/support/tickets/${ticketId}`);
  },

  /**
   * Add a message to an existing support ticket
   * @param ticketId Ticket ID
   * @param message Message content
   * @param attachments Optional file attachments
   * @returns Promise with API response
   */
  addMessage: (
    ticketId: string,
    message: string,
    attachments?: any[]
  ): Promise<ApiResponse> => {
    return apiClient.post(`/passenger/support/tickets/${ticketId}/message`, {
      message,
      attachments
    });
  },

  /**
   * Get FAQ list
   * @param category Optional category to filter FAQs
   * @returns Promise with API response containing FAQs
   */
  getFAQs: (category?: string): Promise<ApiResponse> => {
    const url = category 
      ? `/passenger/support/faq?category=${category}`
      : '/passenger/support/faq';
    return apiClient.get(url);
  },

  /**
   * Submit app feedback
   * @param feedbackData Feedback data
   * @returns Promise with API response
   */
  submitFeedback: (feedbackData: {
    rating: number;
    category: string;
    message: string;
  }): Promise<ApiResponse> => {
    return apiClient.post('/passenger/support/feedback', feedbackData);
  },

  /**
   * Mark FAQ as helpful or not helpful
   * @param faqId FAQ ID
   * @param isHelpful Whether the FAQ was helpful
   * @returns Promise with API response
   */
  markFAQHelpfulness: (
    faqId: string, 
    isHelpful: boolean
  ): Promise<ApiResponse> => {
    return apiClient.post(`/passenger/support/faq/${faqId}/helpful`, {
      isHelpful
    });
  }
};
