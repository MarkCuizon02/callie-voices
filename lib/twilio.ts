import twilio from 'twilio';

// Initialize Twilio client
// In production, use environment variables for API keys
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID || 'AC6a85f2f1df3d7ce6345bfbb9a0f1e7b1',
  process.env.TWILIO_AUTH_TOKEN || '283d3696726fa76ae8b5c7268806bab5'
);

export async function initiateCall(
  to: string,
  from: string,
  webhookUrl: string
): Promise<{ callSid: string }> {
  try {
    const call = await twilioClient.calls.create({
      to,
      from,
      url: webhookUrl,
      statusCallback: `${webhookUrl}/status-callback`,
      statusCallbackMethod: 'POST',
      record: true,
    });

    return { callSid: call.sid };
  } catch (error) {
    console.error('Error initiating call:', error);
    throw error;
  }
}

export async function sendSMS(
  to: string,
  from: string,
  body: string
): Promise<{ messageSid: string }> {
  try {
    const message = await twilioClient.messages.create({
      to,
      from,
      body,
    });

    return { messageSid: message.sid };
  } catch (error) {
    console.error('Error sending SMS:', error);
    throw error;
  }
}

export async function getCallDetails(callSid: string): Promise<any> {
  try {
    const call = await twilioClient.calls(callSid).fetch();
    return call;
  } catch (error) {
    console.error('Error getting call details:', error);
    throw error;
  }
}

export async function getRecordings(callSid: string): Promise<any[]> {
  try {
    const recordings = await twilioClient.recordings.list({ callSid });
    return recordings;
  } catch (error) {
    console.error('Error getting recordings:', error);
    throw error;
  }
}