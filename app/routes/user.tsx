import {
  getAuthSession,
  getUser,
  globalStorageMiddleware,
} from "~/domain/utils/global-context";
import type { Route } from "./+types/user";
import { Button, Checkbox, Input } from "@heroui/react";
import { Form, type unstable_MiddlewareFunction } from "react-router";
import prisma from "~/db.server";
import { zfd } from "zod-form-data";
import { z } from "zod";

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
  let { firstName, lastName, email } = updateSchema.parse(
    await request.formData()
  );

  let updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { firstName, lastName, email },
  });

  return { updatedUser };
}

export default function ({ loaderData }: Route.ComponentProps) {
  let { user } = loaderData;

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
            <Checkbox isSelected={true} />
          ) : (
            <div className="inline-flex">
              <Checkbox onSelect={() => console.log("signup laylo")} />
              <p className="font-bold text-md">
                Get notified when new content drops
              </p>
            </div>
          )}
          <Button color="primary" type="submit">
            Update Information
          </Button>
          {/* TODO put favorites and saved here */}
        </div>
      </Form>
    </div>
  );
}
