import {
  getAuthSession,
  getUser,
  globalStorageMiddleware,
} from "~/domain/utils/global-context";
import type { Route } from "./+types/user";
import { Button, Checkbox, Input } from "@heroui/react";
import {
  Form,
  useFetcher,
  type unstable_MiddlewareFunction,
} from "react-router";
import prisma from "~/db.server";
import { zfd } from "zod-form-data";
import { z } from "zod";
import { subToLaylo } from "~/domain/utils/sbf-client.server";

export function meta() {
  return [
    { title: "User - SBF" },
    {
      property: "og:title",
      content: "Sam Barber Files",
    },
    {
      name: "description",
      content: "User details page",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  let user = getUser();
  return { user };
}

const updateSchema = zfd.formData({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
});

export async function action({ request }: Route.LoaderArgs) {
  let user = getUser();
  switch (request.method) {
    case "POST": {
      let { firstName, lastName, email } = updateSchema.parse(
        await request.formData()
      );

      let updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { firstName, lastName, email },
      });

      return { updatedUser };
    }
    case "PATCH": {
      let resp = subToLaylo(user.phoneNumber);
      let updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { signedUpForLaylo: true },
      });

      return { updatedUser };
    }
  }
}

export default function ({ loaderData }: Route.ComponentProps) {
  let { user } = loaderData;

  let fetcher = useFetcher();

  const subToLaylo = () => {
    return fetcher.submit(new FormData(), { method: "PATCH" });
  };

  return (
    <div className="flex flex-col w-full items-center">
      <Form encType={"multipart/form-data"} method="POST">
        <div className="w-[400px] mt-10 gap-3 flex-col flex">
          <Input
            name="firstName"
            placeholder="First Name..."
            defaultValue={user.firstName}
          />
          <Input
            name="lastName"
            placeholder="Last Name..."
            defaultValue={user.lastName}
          />
          <Input
            name="email"
            placeholder="Email..."
            defaultValue={user.email ?? ""}
          />
          <p>Phone Number: {user.phoneNumber}</p>
          {user.signedUpForLaylo ? (
            <div className="inline-flex">
              <Checkbox isSelected={true} />
              <p className="font-bold text-md">Signed up for drop updates</p>
            </div>
          ) : (
            <div className="inline-flex">
              <Checkbox onChange={subToLaylo} />
              <p className="font-bold text-md">
                Get notified when new content drops
              </p>
            </div>
          )}
          <p>
            By signing up you agree to Laylo's{" "}
            <a
              className={"underline text-blue-500"}
              href="https://docs.laylo.com/en/articles/6497431-terms-of-service"
            >
              terms and conditions
            </a>{" "}
            and{" "}
            <a
              className={"underline text-blue-500"}
              href="https://docs.laylo.com/en/articles/6497219-privacy-and-gdpr-policy"
            >
              privacy policy
            </a>
          </p>
          <Button color="primary" type="submit">
            Update Information
          </Button>
          {/* TODO put favorites and saved here */}
        </div>
      </Form>
    </div>
  );
}
