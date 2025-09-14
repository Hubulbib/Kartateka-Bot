import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { User } from "./user";
import { Cafe } from "./cafe";

@Entity()
export class City {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", unique: true })
  name: string;

  @OneToMany(() => User, (user) => user.city)
  users: User[];

  @OneToMany(() => Cafe, (cafe) => cafe.city)
  cafe: Cafe[];
}
