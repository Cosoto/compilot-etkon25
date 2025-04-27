"use client";

import { useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

export default function SupportPage() {
  const { user } = useUser();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setIsSending(true);
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user?.email,
          subject: subject.trim(),
          message: message.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to send message');
      }

      toast.success('Message sent successfully! We will get back to you soon.');
      setSubject("");
      setMessage("");
    } catch (error: unknown) {
      console.error('Error sending message:', error);
      let errorMessage = 'Failed to send message. Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <h1 className="text-3xl font-bold mb-6">Contact Support</h1>
        
        <div className="prose max-w-none mb-8">
          <h2 className="text-xl font-semibold mb-4">About ComPilot</h2>
          <p className="mb-4">
            ComPilot is your comprehensive skill management system designed to help organizations
            track, develop, and optimize their workforce capabilities. Our platform enables:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Efficient skill tracking and assessment</li>
            <li>Team performance visualization</li>
            <li>Training needs identification</li>
            <li>Employee development planning</li>
            <li>Department-wide skill gap analysis</li>
          </ul>
          
          <h2 className="text-xl font-semibold mb-4">Need Help?</h2>
          <p className="mb-4">
            If you have any questions, concerns, or need assistance, please fill out the form below.
            Our support team will get back to you as soon as possible.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
              Subject
            </label>
            <input
              type="text"
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
              placeholder="Enter the subject of your message"
              required
            />
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
              Message
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
              placeholder="Describe your issue or question in detail"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSending || !subject.trim() || !message.trim()}
            className="flex items-center justify-center w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Message
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
} 