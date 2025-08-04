import axios from "axios";

const layloKey = process.env.LAYLO_KEY;

export const subToLaylo = async (phoneNumber: string) => {
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
    console.log("User added successfully:", response.data);
    return response.data;
  } catch (error: any) {
    console.error(
      "Error adding user:",
      error?.response?.data || error?.message
    );
    throw error;
  }
};
