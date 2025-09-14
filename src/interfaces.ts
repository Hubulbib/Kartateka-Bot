import { Context, SessionFlavor } from "grammy";
import { Cafe } from "./entities/cafe";
import { City } from "./entities/city";
import { Review } from "./entities/review";
import { User } from "./entities/user";

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

  cafeData?: Partial<Cafe & { skipOwner: boolean }>;
  cityData?: Partial<City>;
  reviewData?: Partial<Review>;
  userData?: Partial<User>;
}

export type AppContext = Context & SessionFlavor<SessionData>;
