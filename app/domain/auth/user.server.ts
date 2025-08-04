import prisma from "~/db.server";
import { getAuthSession } from "~/domain/utils/global-context";
import { subToLaylo } from "~/domain/utils/sbf-client.server";

export type NewUserData = {
  phoneNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  state?: string;
  signUpToLaylo: boolean;
};

export async function getUserByPhoneNumber(phoneNumber: string) {
  const user = await prisma.user.findUnique({
    where: { phoneNumber },
  });
  return user;
}

export async function registerUser(userData: NewUserData) {
  const existingUser = await getUserByPhoneNumber(userData.phoneNumber);
  // User already exists, return an error
  if (existingUser) {
    return {
      errors: {
        phoneNumber: {
          message: "User with phone number already exists",
          type: "custom",
        },
      },
    };
  }

  let layloSignedUp = false;

  if (userData.signUpToLaylo) {
    await subToLaylo(userData.phoneNumber)
    layloSignedUp = true
  }

  // Create a new user
  const newUser = await prisma.user.create({
    data: {
      phoneNumber: userData.phoneNumber,
      email: userData.email,
      signedUpForLaylo: layloSignedUp,
      firstName: userData.firstName,
      lastName: userData.lastName,
    },
  });

  const authSession = getAuthSession();
  authSession.set("user", {
    id: newUser.id,
    phoneNumber: newUser.phoneNumber,
  });
  return {
    errors: null,
  };
}

export async function loginUser(phoneNumber: string) {
  const userExists = await getUserByPhoneNumber(phoneNumber);
  if (!userExists) {
    await registerUser({
      phoneNumber,
      signUpToLaylo: false,
      firstName: "",
      lastName: "",
    });

    return {
      errors: {
        phoneNumber: {
          createdUser: true,
          message: "This number does not exist",
        },
      },
    };
  }

  const authSession = getAuthSession();
  authSession.set("user", {
    id: userExists.id,
    phoneNumber: userExists.phoneNumber,
  });
  return {
    errors: null,
  };
}

export async function signoutUser() {
  const authSession = getAuthSession();
  authSession.unset("user");
  return null;
}
