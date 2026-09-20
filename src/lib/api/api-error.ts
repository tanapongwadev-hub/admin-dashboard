export class ApiError extends Error {
  constructor(message: string, public status: number, public body: unknown) {
    super(message);
    this.name = "ApiError";
  }

  get code(): string | undefined {
    if (this.body && typeof this.body === "object" && "code" in this.body) {
      return typeof this.body.code === "string" ? this.body.code : undefined;
    }
  }
}
