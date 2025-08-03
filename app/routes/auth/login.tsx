import { Button, Input, InputOtp } from "@heroui/react";
import { redirect, useFetcher } from "react-router";
import type { Route } from "./+types/login";
import { zfd } from "zod-form-data";
import z from "zod";
import prisma from "~/db.server";
import { loginUser } from "~/domain/auth/user.server";

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
  otpCode: z.coerce.number(),
});

export async function action({ request }: Route.ActionArgs) {
  let formData = await request.formData();
  switch (request.method) {
    case "POST": {
      let { phoneNumber } = requestCodeSchema.parse(formData);
      // TODO hit twillio with phone number
      let otpCode = 435123;
      let date = new Date();
      await prisma.validCodes.create({
        data: {
          otpCode: otpCode,
          phoneNumber,
          issuedAt: date,
          expiresAt: new Date(date.getTime() + 5 * 60 * 1000),
        },
      });

      return { phoneNumber };
    }
    case "PATCH": {
      let { phoneNumber, otpCode } = loginSchema.parse(formData);
      let match = await prisma.validCodes.delete({
        where: {
          otpCode_phoneNumber: {
            otpCode,
            phoneNumber,
          },
        },
      });
      if (match) {
        let expired = match.expiresAt < new Date();
        if (expired) {
          return { invalid: true };
        }
        const { errors: loginErrors } = await loginUser(phoneNumber);

        if (loginErrors?.phoneNumber?.createdUser) {
          throw redirect("/user?signup=true");
        } else if (loginErrors) {
          return { invalid: true };
        }

        // todo set cookie
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

  const validateCode = (code: string) => {
    let formData = new FormData();
    formData.set("phoneNumber", fetcher.data?.phoneNumber);
    formData.set("otpCode", code);

    return otpFetcher.submit(formData, {
      encType: "multipart/form-data",
      method: "PATCH",
    });
  };

  console.log(fetcher.data);
  return (
    <div className="w-full flex-col flex items-center justify-center">
      <p>Sam Barber Files User Login...</p>
      <fetcher.Form method="POST" encType={"multipart/form-data"}>
        <Input name="phoneNumber" />
        <Button type="submit">Request Code</Button>
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
