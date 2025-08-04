import { Button, InputOtp } from "@heroui/react";
import { redirect, useFetcher } from "react-router";
import type { Route } from "./+types/login";
import { zfd } from "zod-form-data";
import z from "zod";
import { loginUser } from "~/domain/auth/user.server";
import {
  verifyOtpCode,
  verifyPhoneNumber,
} from "~/domain/utils/sbf-client.server";
import { PhoneInput } from "~/components/PhoneInput";
import RequestCodeButton from "~/components/RequestCodeButton";
import { useEffect, useState } from "react";

export function meta() {
  return [
    { title: "Login - SBF" },
    {
      property: "og:title",
      content: "Sam Barber Files",
    },
    {
      name: "description",
      content: "Log in to SBF",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  return null;
}

const requestCodeSchema = zfd.formData({
  phoneNumber: z.string(),
});

const loginSchema = zfd.formData({
  phoneNumber: z.string(),
  otpCode: z.string(),
});

export async function action({ request }: Route.ActionArgs) {
  let formData = await request.formData();
  switch (request.method) {
    case "POST": {
      let { phoneNumber } = requestCodeSchema.parse(formData);
      if (phoneNumber.length < 6) {
        return null;
      }
      let gotCode = await verifyPhoneNumber(phoneNumber);
      if (gotCode) {
        return { phoneNumber };
      }
      return null;
    }
    case "PATCH": {
      let { phoneNumber, otpCode } = loginSchema.parse(formData);
      let approved = await verifyOtpCode(phoneNumber, otpCode);
      if (approved) {
        const { errors: loginErrors } = await loginUser(phoneNumber);

        if (loginErrors?.phoneNumber?.createdUser) {
          throw redirect("/user?signup=true");
        } else if (loginErrors) {
          return { invalid: true };
        }

        let searchParams = new URL(request.url).searchParams;
        let redirectTo = searchParams.get("redirectTo");
        throw redirect(redirectTo ?? "/");
      }
      return { invalid: true };
    }
  }
}

export default function () {
  let fetcher = useFetcher();
  let otpFetcher = useFetcher();

  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown > 0) {
      const interval = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [cooldown]);

  useEffect(() => {
    if (fetcher.state == "idle" && fetcher.data) {
      setCooldown(60);
    }
  }, [fetcher.state, fetcher.data]);

  const validateCode = (code: string) => {
    let formData = new FormData();
    formData.set("phoneNumber", fetcher.data?.phoneNumber);
    formData.set("otpCode", code);

    return otpFetcher.submit(formData, {
      encType: "multipart/form-data",
      method: "PATCH",
    });
  };

  return (
    <div className="w-full flex-col flex items-center justify-center bg-black">
      <p className="text-2xl font-semibold">Sam Barber Files</p>
      <p className="font-semibold mb-3">Login/Sign Up</p>

      <fetcher.Form
        method="POST"
        className="text-center"
        encType={"multipart/form-data"}
      >
        <p>Phone Number</p>
        <PhoneInput defaultCountry="US" name="phoneNumber" international />
        <Button
          type="submit"
          disabled={cooldown > 0}
          className={`mt-2 px-4 py-2 rounded ${
            cooldown > 0
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          } text-white transition`}
        >
          {cooldown > 0 ? `Request new code in ${cooldown}s` : "Request Code"}
        </Button>
      </fetcher.Form>
      {fetcher.data && (
        <div>
          <InputOtp
            length={6}
            name="otpCode"
            errorMessage={"Invalid code"}
            isInvalid={otpFetcher.data?.invalid}
            onComplete={(e) => validateCode(e)}
          />
        </div>
      )}
    </div>
  );
}
