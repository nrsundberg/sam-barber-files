import axios from "axios";
import twilio from "twilio";

const layloKey = process.env.LAYLO_KEY;
const twilioSid = process.env.TWILIO_SID;
const twilioToken = process.env.TWILIO_TOKEN;

const twilioClient = twilio(twilioSid, twilioToken);

export const verifyPhoneNumber = async (
  phoneNumber: string
): Promise<boolean> => {
  try {
    await twilioClient.verify.v2
      .services("VAfeb04b2b2e0d6d6546e0bac917b4b3ae")
      .verifications.create({ to: phoneNumber, channel: "sms" });
    return true;
  } catch (e: any) {
    console.error(e);
    return false;
  }
};

export const verifyOtpCode = async (
  phoneNumber: string,
  otpCode: string
): Promise<boolean> => {
  try {
    let resp = await twilioClient.verify.v2
      .services("VAfeb04b2b2e0d6d6546e0bac917b4b3ae")
      .verificationChecks.create({
        to: phoneNumber,
        code: otpCode,
      });

    return resp.status == "approved";
  } catch (e: any) {
    console.error(e);
    return false;
  }
};

export const subToLaylo = async (phoneNumber: string): Promise<boolean> => {
  let url = "https://laylo.com/api/graphql";

  const mutation = `
    mutation($email: String, $phoneNumber: String) {
      subscribeToUser(email: $email, phoneNumber: $phoneNumber)
    }
  `;

  const variables = {
    email: null,
    phoneNumber: phoneNumber,
  };

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${layloKey}`,
  };

  try {
    const response = await axios.post(
      url,
      {
        query: mutation,
        variables: variables,
      },
      { headers }
    );
    return true;
  } catch (error: any) {
    console.error(
      "Error adding user:",
      error?.response?.data || error?.message
    );
    return false;
  }
};
