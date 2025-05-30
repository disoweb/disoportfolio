
import { db } from "./db";
import { users, services, orders, projects, projectStages } from "@shared/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

async function seedDatabase() {
  console.log("Seeding database...");

  try {
    // Check if admin user already exists
    const existingAdmin = await db.select().from(users).where(eq(users.email, "admin@disowebs.com"));
    let adminUser;
    
    if (existingAdmin.length === 0) {
      adminUser = await db.insert(users).values({
        id: crypto.randomUUID(),
        email: "admin@disowebs.com",
        password: "admin123", // In production, this should be hashed
        firstName: "Admin",
        lastName: "User",
        role: "admin"
      }).returning();
      console.log("Created admin user");
    } else {
      adminUser = existingAdmin;
      console.log("Admin user already exists");
    }

    // Check if client user already exists
    const existingClient = await db.select().from(users).where(eq(users.email, "client@example.com"));
    let clientUser;
    
    if (existingClient.length === 0) {
      clientUser = await db.insert(users).values({
        id: crypto.randomUUID(),
        email: "client@example.com",
        password: "client123", // In production, this should be hashed
        firstName: "John",
        lastName: "Doe",
        role: "client",
        companyName: "Example Corp"
      }).returning();
      console.log("Created client user");
    } else {
      clientUser = existingClient;
      console.log("Client user already exists");
    }

    // Check if services already exist
    const existingServices = await db.select().from(services);
    
    if (existingServices.length === 0) {
      // Create services
      const launchService = await db.insert(services).values({
        name: "Launch Package",
        description: "Perfect for small businesses and startups looking to establish their online presence",
        priceUsd: "150000", // ₦150,000
        category: "launch",
        isActive: true
      }).returning();

      const growthService = await db.insert(services).values({
        name: "Growth Package", 
        description: "Ideal for growing businesses that need advanced features and functionality",
        priceUsd: "350000", // ₦350,000
        category: "growth",
        isActive: true
      }).returning();

      const eliteService = await db.insert(services).values({
        name: "Elite Package",
        description: "Premium solution for established businesses requiring custom features",
        priceUsd: "800000", // ₦800,000
        category: "elite", 
        isActive: true
      }).returning();

      console.log("Created services");

      // Create sample order only if client exists and no orders exist
      const existingOrders = await db.select().from(orders).where(eq(orders.userId, clientUser[0].id));
      
      if (existingOrders.length === 0) {
        const sampleOrder = await db.insert(orders).values({
          userId: clientUser[0].id,
          serviceId: launchService[0].id,
          totalPrice: "150000",
          status: "paid"
        }).returning();

        // Create sample project
        const sampleProject = await db.insert(projects).values({
          orderId: sampleOrder[0].id,
          userId: clientUser[0].id,
          projectName: "Example Corp Website",
          currentStage: "Design",
          status: "active",
          startDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days from now
        }).returning();

        // Create project stages
        const stages = [
          { title: "Discovery", description: "Understanding requirements and planning", orderIndex: 1 },
          { title: "Design", description: "Creating wireframes and visual designs", orderIndex: 2 },
          { title: "Development", description: "Building the website functionality", orderIndex: 3 },
          { title: "Testing", description: "Quality assurance and bug fixes", orderIndex: 4 },
          { title: "Launch", description: "Going live and final deployment", orderIndex: 5 }
        ];

        for (const stage of stages) {
          await db.insert(projectStages).values({
            projectId: sampleProject[0].id,
            title: stage.title,
            description: stage.description,
            orderIndex: stage.orderIndex,
            isComplete: stage.orderIndex === 1 // Mark first stage as complete
          });
        }

        console.log("Created sample order and project");
      } else {
        console.log("Sample data already exists");
      }
    } else {
      console.log("Services already exist");
    }

    console.log("Database seeded successfully!");
    console.log("Admin login: admin@disowebs.com / admin123");
    console.log("Client login: client@example.com / client123");

  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

seedDatabase();
