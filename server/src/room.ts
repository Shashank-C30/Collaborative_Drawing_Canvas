import { User } from "./protocol";

export class Room {
  public readonly id: string;

  private users: Map<string, User> = new Map();

  constructor(id: string) {
    this.id = id;
  }

  // Add a user to the room
  addUser(user: User): void {
    this.users.set(user.id, user);
  }

  // Remove a user from the room
  removeUser(userId: string): void {
    this.users.delete(userId);
  }

  // Get a specific user
  getUser(userId: string): User | undefined {
    return this.users.get(userId);
  }

  // Get all users in the room
  getUsers(): User[] {
    return Array.from(this.users.values());
  }

  // Check whether a user exists in the room
  hasUser(userId: string): boolean {
    return this.users.has(userId);
  }

  // Number of connected users
  getUserCount(): number {
    return this.users.size;
  }

  // Check whether the room is empty
  isEmpty(): boolean {
    return this.users.size === 0;
  }
}