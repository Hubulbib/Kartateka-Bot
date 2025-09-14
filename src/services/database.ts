import { DataSource } from "typeorm";
import { User } from "../entities/user";
import { City } from "../entities/city";
import { Cafe } from "../entities/cafe";
import { Review } from "../entities/review";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  entities: [User, City, Cafe, Review],
  synchronize: true,
  logging: process.env.NODE_ENV === "development" ? true : false,
});

export class DatabaseService {
  private connection: DataSource;

  async initialize() {
    this.connection = await AppDataSource.initialize();

    console.log("Database connected");
  }

  getConnection(): DataSource {
    return this.connection;
  }
}
