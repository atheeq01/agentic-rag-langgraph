import React from 'react';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-8 text-slate-800 leading-relaxed">
      <h1 className="text-3xl font-bold border-b pb-4 mb-6">Privacy Policy</h1>
      <p className="mb-4"><strong>Effective Date:</strong> May 10, 2026</p>
      <p className="mb-4">
        APEX AI ASSISTANT ("we," "us," or "our"), developed by <strong>Mohamed Atheeq</strong>, 
        is committed to protecting your privacy. This policy explains how we handle your 
        information when you use our HR RAG system.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">1. Information We Collect</h2>
      <p className="mb-4">
        When you connect your Google Account, we access your Gmail data specifically 
        to provide features such as drafting and sending HR-related emails (e.g., leave requests 
        and formal complaints) on your behalf.
      </p>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-6 my-8">
        <h2 className="text-xl font-semibold mb-2">Google API Limited Use Disclosure</h2>
        <p>
          APEX AI ASSISTANT's use and transfer to any other app of information received from Google APIs 
          will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy#limited-use" className="text-blue-600 underline">Google API Services User Data Policy</a>, 
          including the Limited Use requirements.
        </p>
      </div>

      <h2 className="text-xl font-semibold mt-8 mb-2">2. How We Use Your Data</h2>
      <ul className="list-disc ml-6 mb-4">
        <li>We use `gmail.send` only to facilitate features triggered by you within the chat.</li>
        <li>We do not use your data for advertising or marketing purposes.</li>
        <li>No humans read your Google user data except for security or legal compliance.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-2">3. Contact Us</h2>
      <p>Questions? Contact us at: <strong>mohamedatheeq0@gmail.com</strong></p>
    </div>
  );
};

export default PrivacyPolicy;