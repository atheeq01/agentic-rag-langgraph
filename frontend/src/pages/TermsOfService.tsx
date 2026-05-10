import React from 'react';

const TermsOfService: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-8 text-slate-800 leading-relaxed">
      <h1 className="text-3xl font-bold border-b pb-4 mb-6">Terms of Service</h1>
      <p className="mb-4"><strong>Last Updated:</strong> May 10, 2026</p>
      
      <h2 className="text-xl font-semibold mt-8 mb-2">1. Acceptance of Terms</h2>
      <p className="mb-4">
        By using APEX AI ASSISTANT, you agree to these terms. If you disagree with any part, 
        you may not access the service.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">2. User Responsibility</h2>
      <p className="mb-4">
        You are responsible for any emails sent through your connected Google Account via this tool. 
        You agree not to use the assistant for unlawful activity or harassment.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">3. Limitation of Liability</h2>
      <p className="mb-4">
        The service is provided "as is." We are not liable for any damages arising from 
        the use of the AI, including errors in data retrieval or email delivery.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">4. Intellectual Property</h2>
      <p>
        The APEX AI ASSISTANT system architecture is the intellectual property of 
        <strong>Mohamed Atheeq</strong>.
      </p>
    </div>
  );
};

export default TermsOfService;