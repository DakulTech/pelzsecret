import { z } from "zod";

export const productSchema = z.object({
    name: z.string(),
    description: z.string(),
    price: z.number().gt(0, "Product price must be greater than 0 naira"),
    images: z.array(z.object({
        url: z.string(),
        alt: z.string(),
        isDefault: z.boolean().optional(),
    })),
    compareAtPrice: z.number().optional(),
    categories: z.array(z.string()).optional(),
    brand: z.string().optional(),
    sku: z.string().optional(),
    inventory: z.object({
        quantity: z.number().default(10),
        reserved: z.number().default(0),
        status: z.enum(["in_stock", "out_of_stock", "discontinued"]).default("in_stock")
    }).optional(),
    variants: z.array(z.object({
        name: z.string(),
        price: z.number().gt(0),
        sku: z.string().optional(),
        inventory: z.object({
            quantity: z.number().default(0),
        }).optional(),
        attributes: z.array(z.object({
            name: z.string(),
            value: z.string(),
        })).optional(),
    })).optional(),
    specifications: z.object({
        name: z.string(),
        value: z.string(),
    }).passthrough().optional(),
});