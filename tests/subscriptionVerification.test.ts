import request from "supertest";
import {app} from "../src/index"; // your express app
import path from "path";

describe("POST /api/subscriptions/verify", () => {
  it("should create a subscription verification", async () => {
    const res = await request(app)
      .post("/api/subscriptions/verify")
      .set("Authorization", `Bearer TEST_JWT_TOKEN`)
      .attach(
        "image",
        path.join(__dirname, "test-assets/test-image.jpg")
      );

    expect(res.statusCode).toBe(201);
    expect(res.body.verification.review_status).toBe("pending");
  });

  it("should fail if image is missing", async () => {
    const res = await request(app)
      .post("/api/subscriptions/verify")
      .set("Authorization", `Bearer TEST_JWT_TOKEN`);

    expect(res.statusCode).toBe(400);
  });
});
