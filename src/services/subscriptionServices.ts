
export async function createLifetimeSubscription(client: any, user_id: string) {
    const query = `
    INSERT INTO subscriptions
    (user_id, plan_type, status, start_date, end_date)
    VALUES ($1, 'lifetime_free', 'active', NOW(), NULL)
    RETURNING *
  `;
    const { rows } = await client.query(query, [user_id]);
    return rows[0];
}

export async function createPaidSubscription(
    client: any,
    {
        user_id,
        subscription_type,
        start_date,
    }: {
        user_id: string;
        subscription_type: "free" | "monthly" | "yearly" | "lifetime_free";
        start_date?: Date;
    }
) {
    const start = start_date ? new Date(start_date) : new Date();
    let end_date: Date | null = null;

    if (subscription_type === "monthly") {
        end_date = new Date(start);
        end_date.setMonth(end_date.getMonth() + 1);
    } else if (subscription_type === "yearly") {
        end_date = new Date(start);
        end_date.setFullYear(end_date.getFullYear() + 1);
    }

    const query = `
    INSERT INTO subscriptions
    (user_id, plan_type, status, start_date, end_date)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;

    const { rows } = await client.query(query, [
        user_id,
        subscription_type,
        "active",
        start,
        end_date,
    ]);

    return rows[0];
}
