import { AppContext } from "../../interfaces";
import { handleAddCafe, handleEditCafe } from "../handlers/admin/admin-cafe";
import { handleAddCity, handleEditCity } from "../handlers/admin/admin-city";

export const adminEventsInit = async (ctx: AppContext, isAdmin: boolean) => {
  if (!isAdmin || !ctx.session.adminAction) return;

  switch (ctx.session.adminAction) {
    case "add_cafe":
      await handleAddCafe(ctx);
      break;
    case "edit_cafe_name":
    case "edit_cafe_description":
    case "edit_cafe_address":
    case "edit_cafe_avatar":
    case "edit_cafe_owner":
      await handleEditCafe(ctx);
      break;
    case "add_city":
      await handleAddCity(ctx);
      break;
    case "edit_city":
      await handleEditCity(ctx);
      break;
  }
};
