import { Button, Input, InputOtp } from "@heroui/react";
import { redirect, useFetcher } from "react-router";
import type { Route } from "./+types/login";
import { randomInt } from "node:crypto";
import { zfd } from "zod-form-data";
import z from "zod";
import prisma from "~/db.server";
import { useRef } from "react";

export async function loader({ request }: Route.LoaderArgs) {
  return null;
  // return redirect("/kinde-auth/login");
}

const requestCodeSchema = zfd.formData({
  phoneNumber: z.string(),
});

const loginSchema = zfd.formData({
  sessionCode: z.string(),
  otpCode: z.coerce.number(),
});

export async function action({ request }: Route.ActionArgs) {
  let formData = await request.formData();
  console.log(request.method);
  switch (request.method) {
    case "POST": {
      let { phoneNumber } = requestCodeSchema.parse(formData);
      return { sessionCode: "123" + randomInt(1000) };
    }
    case "PATCH": {
      console.log("me");
      let { sessionCode, otpCode } = loginSchema.parse(formData);
      // tODO look up the session and compare against the list of valids
      let match = await prisma.validCodes.findFirst({
        where: {
          otpCode,
          sessionId: sessionCode,
        },
      });
      if (match) {
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
    formData.set("sessionCode", fetcher.data?.sessionCode);
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
        <Input name="phoneNumber" defaultValue="123" />
        <Button type="submit">Request Code</Button>
      </fetcher.Form>
      {fetcher.data && (
        <div>
          <input
            readOnly
            hidden
            name="sessionCode"
            value={fetcher.data?.sessionCode}
          />
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
