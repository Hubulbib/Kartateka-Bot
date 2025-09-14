import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from "typeorm";
import { User } from "./user";
import { City } from "./city";
import { Review } from "./review";

@Entity()
export class Cafe {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", unique: true })
  name: string;

  @Column({ type: "varchar", unique: true })
  description: string;

  @Column({ type: "varchar" })
  avatar: string;

  @Column({ type: "varchar", array: true })
  address: string[];

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "owner_id" })
  owner: User;

  @ManyToOne(() => City, { eager: true, onDelete: "SET NULL" })
  city: City;

  @OneToMany(() => Review, (review) => review.cafe)
  reviews: Review[];
}
