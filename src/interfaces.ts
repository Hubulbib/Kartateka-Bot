import { Prisma } from "@prisma/client";
import { Context, SessionFlavor } from "grammy";

export type AdminAction =
  | "add_cafe"
  | "edit_cafe_name"
  | "edit_cafe_description"
  | "edit_cafe_avatar"
  | "edit_cafe_address"
  | "edit_cafe_owner"
  | "add_city"
  | `edit_city`
  | "add_review"
  | `edit_review`
  | "add_user"
  | `edit_user`
  | undefined;

export interface SessionData {
  adminAction?: AdminAction;
  adminEditingCafeId?: number;
  adminEditingCityId?: number;

  cafeData?: Partial<
    Prisma.CafeGetPayload<{ include: { user: true; city: true } }> & {
      skipOwner: boolean;
    }
  >;
  cityData?: Partial<Prisma.CityGetPayload<{}>>;
  reviewData?: Partial<Prisma.ReviewGetPayload<{}>>;
  userData?: Partial<Prisma.UserGetPayload<{}>>;
}

export type AppContext = Context & SessionFlavor<SessionData>;
