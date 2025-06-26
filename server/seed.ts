
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
      const servicePackages = [
        {
          id: "landing-page",
          name: "Landing Page",
          description: "Perfect for showcasing your business",
          priceUsd: "150000",
          originalPriceUsd: "200000",
          duration: "3-5 days",
          spotsRemaining: 2,
          totalSpots: 10,
          features: JSON.stringify([
            "Responsive design",
            "Contact form",
            "SEO optimization",
            "Basic analytics",
            "Social media integration",
            "1 month support"
          ]),
          addOns: JSON.stringify([
            { name: "WhatsApp Integration", price: 15000 },
            { name: "Live Chat Widget", price: 25000 },
            { name: "Advanced Analytics", price: 20000 }
          ]),
          recommended: false,
          category: "launch" as const,
          industry: JSON.stringify(["tech", "consulting", "portfolio"]),
          isActive: true
        },
        {
          id: "ecommerce-app",
          name: "E-commerce App",
          description: "Complete online store with payment integration",
          priceUsd: "500000",
          originalPriceUsd: "600000",
          duration: "2-3 weeks",
          spotsRemaining: 3,
          totalSpots: 8,
          features: JSON.stringify([
            "Product catalog",
            "Shopping cart",
            "Payment integration",
            "Order management",
            "Customer accounts",
            "Admin dashboard",
            "Mobile responsive",
            "3 months support"
          ]),
          addOns: JSON.stringify([
            { name: "Advanced Analytics", price: 50000 },
            { name: "Multi-vendor Support", price: 100000 },
            { name: "Mobile App", price: 200000 }
          ]),
          recommended: true,
          category: "growth" as const,
          industry: JSON.stringify(["retail", "restaurant", "ecommerce"]),
          isActive: true
        },
        {
          id: "custom-webapp",
          name: "Custom Web Application",
          description: "Tailored web applications for your business needs",
          priceUsd: "800000",
          originalPriceUsd: "1000000",
          duration: "4-6 weeks",
          spotsRemaining: 1,
          totalSpots: 5,
          features: JSON.stringify([
            "Custom development",
            "User authentication",
            "Database integration",
            "API development",
            "Admin dashboard",
            "Advanced security",
            "6 months support"
          ]),
          addOns: JSON.stringify([
            { name: "Mobile App", price: 400000 },
            { name: "Third-party Integrations", price: 150000 },
            { name: "Advanced Security", price: 100000 }
          ]),
          recommended: false,
          category: "elite" as const,
          industry: JSON.stringify(["saas", "healthcare", "fintech"]),
          isActive: true
        },
        {
          id: "hospital-management",
          name: "Hospital App",
          description: "Streamline hospital operations and patient care",
          priceUsd: "1200000",
          originalPriceUsd: "1500000",
          duration: "6-8 weeks",
          spotsRemaining: 2,
          totalSpots: 3,
          features: JSON.stringify([
            "Patient Registration & Management",
            "Appointment Scheduling",
            "Electronic Health Records (EHR)",
            "Billing & Invoicing",
            "Inventory Management (Pharmacy/Supplies)",
            "Staff Management & Payroll",
            "Reporting & Analytics",
            "Secure Data Handling (HIPAA-compliant design)",
            "6 months premium support"
          ]),
          addOns: JSON.stringify([
            { name: "Telemedicine Module", price: 300000 },
            { name: "Advanced Reporting & BI", price: 150000 },
            { name: "Patient Portal", price: 200000 },
            { name: "HL7/FHIR Integration Support", price: 250000 }
          ]),
          recommended: false,
          category: "elite" as const,
          industry: JSON.stringify(["healthcare"]),
          isActive: true
        }
      ];

      await db.insert(services).values(servicePackages);
      console.log("Created service packages");
    } else {
      console.log("Service packages already exist");
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
