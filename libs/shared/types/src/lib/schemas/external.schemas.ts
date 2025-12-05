/**
 * Zod schemas for external API responses.
 *
 * These schemas validate responses from external APIs used by mock services,
 * ensuring type safety when processing third-party data.
 */

import { z } from 'zod';

/**
 * Schema for JSONPlaceholder user response.
 * Used by query-api-mock.service.ts for customer data simulation.
 */
export const JsonPlaceholderUserSchema = z.object({
  id: z.number(),
  name: z.string(),
  username: z.string(),
  email: z.string(),
  address: z
    .object({
      street: z.string().optional(),
      suite: z.string().optional(),
      city: z.string(),
      zipcode: z.string(),
      geo: z
        .object({
          lat: z.string(),
          lng: z.string(),
        })
        .optional(),
    })
    .optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  company: z
    .object({
      name: z.string(),
      catchPhrase: z.string().optional(),
      bs: z.string().optional(),
    })
    .optional(),
});

/**
 * Schema for JSONPlaceholder post response.
 */
export const JsonPlaceholderPostSchema = z.object({
  userId: z.number(),
  id: z.number(),
  title: z.string(),
  body: z.string(),
});

/**
 * Schema for RandomUser API name object.
 */
export const RandomUserNameSchema = z.object({
  title: z.string().optional(),
  first: z.string(),
  last: z.string(),
});

/**
 * Schema for RandomUser API location object.
 */
export const RandomUserLocationSchema = z.object({
  street: z
    .object({
      number: z.number().optional(),
      name: z.string().optional(),
    })
    .optional(),
  city: z.string(),
  state: z.string(),
  country: z.string(),
  postcode: z.union([z.string(), z.number()]).optional(),
});

/**
 * Schema for RandomUser API DOB object.
 */
export const RandomUserDobSchema = z.object({
  date: z.string().optional(),
  age: z.number(),
});

/**
 * Schema for RandomUser API registered object.
 */
export const RandomUserRegisteredSchema = z.object({
  date: z.string().optional(),
  age: z.number().optional(),
});

/**
 * Schema for RandomUser API login object.
 */
export const RandomUserLoginSchema = z.object({
  uuid: z.string(),
  username: z.string().optional(),
  password: z.string().optional(),
  salt: z.string().optional(),
  md5: z.string().optional(),
  sha1: z.string().optional(),
  sha256: z.string().optional(),
});

/**
 * Schema for RandomUser API coordinates object.
 */
export const RandomUserCoordinatesSchema = z.object({
  latitude: z.string().optional(),
  longitude: z.string().optional(),
});

/**
 * Schema for RandomUser API timezone object.
 */
export const RandomUserTimezoneSchema = z.object({
  offset: z.string().optional(),
  description: z.string().optional(),
});

/**
 * Schema for RandomUser API picture object.
 */
export const RandomUserPictureSchema = z.object({
  large: z.string().optional(),
  medium: z.string().optional(),
  thumbnail: z.string().optional(),
});

/**
 * Schema for full RandomUser API location object.
 */
export const RandomUserFullLocationSchema = z.object({
  street: z
    .object({
      number: z.number().optional(),
      name: z.string().optional(),
    })
    .optional(),
  city: z.string(),
  state: z.string(),
  country: z.string(),
  postcode: z.union([z.string(), z.number()]).optional(),
  coordinates: RandomUserCoordinatesSchema.optional(),
  timezone: RandomUserTimezoneSchema.optional(),
});

/**
 * Schema for RandomUser API user response.
 * Used by query-api-mock.service.ts for demographic data simulation.
 */
export const RandomUserSchema = z.object({
  name: RandomUserNameSchema,
  email: z.string(),
  location: RandomUserLocationSchema,
  dob: RandomUserDobSchema,
  phone: z.string().optional(),
  cell: z.string().optional(),
  nat: z.string().optional(),
});

/**
 * Schema for full RandomUser API user response with all fields.
 * Used for large-dataset and synthetic-expansion queries.
 */
export const RandomUserFullSchema = z.object({
  login: RandomUserLoginSchema,
  name: RandomUserNameSchema,
  email: z.string(),
  gender: z.string().optional(),
  location: RandomUserFullLocationSchema,
  dob: RandomUserDobSchema,
  registered: RandomUserRegisteredSchema.optional(),
  phone: z.string().optional(),
  cell: z.string().optional(),
  nat: z.string().optional(),
  picture: RandomUserPictureSchema.optional(),
});

/**
 * Schema for full RandomUser API response wrapper.
 */
export const RandomUserFullResponseSchema = z.object({
  results: z.array(RandomUserFullSchema),
  info: z
    .object({
      seed: z.string().optional(),
      results: z.number().optional(),
      page: z.number().optional(),
      version: z.string().optional(),
    })
    .optional(),
});

/**
 * Schema for RandomUser API response wrapper.
 */
export const RandomUserResponseSchema = z.object({
  results: z.array(RandomUserSchema),
  info: z
    .object({
      seed: z.string().optional(),
      results: z.number().optional(),
      page: z.number().optional(),
      version: z.string().optional(),
    })
    .optional(),
});

/**
 * Schema for DummyJSON product dimensions.
 */
export const DummyJsonDimensionsSchema = z.object({
  width: z.number().optional(),
  height: z.number().optional(),
  depth: z.number().optional(),
});

/**
 * Schema for DummyJSON product.
 * Used by query-api-mock.service.ts for product catalog simulation.
 */
export const DummyJsonProductSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().optional(),
  category: z.string().optional(),
  price: z.number().optional(),
  discountPercentage: z.number().optional(),
  rating: z.number().optional(),
  stock: z.number().optional(),
  brand: z.string().optional(),
  sku: z.string().optional(),
  weight: z.number().optional(),
  dimensions: DummyJsonDimensionsSchema.optional(),
  warrantyInformation: z.string().optional(),
  shippingInformation: z.string().optional(),
  availabilityStatus: z.string().optional(),
  returnPolicy: z.string().optional(),
  minimumOrderQuantity: z.number().optional(),
  thumbnail: z.string().optional(),
  images: z.array(z.string()).optional(),
});

/**
 * Schema for DummyJSON products response wrapper.
 */
export const DummyJsonProductsResponseSchema = z.object({
  products: z.array(DummyJsonProductSchema),
  total: z.number().optional(),
  skip: z.number().optional(),
  limit: z.number().optional(),
});

// Type exports derived from schemas
export type JsonPlaceholderUserParsed = z.infer<typeof JsonPlaceholderUserSchema>;
export type JsonPlaceholderPostParsed = z.infer<typeof JsonPlaceholderPostSchema>;
export type RandomUserParsed = z.infer<typeof RandomUserSchema>;
export type RandomUserResponseParsed = z.infer<typeof RandomUserResponseSchema>;
export type RandomUserFullParsed = z.infer<typeof RandomUserFullSchema>;
export type RandomUserFullResponseParsed = z.infer<typeof RandomUserFullResponseSchema>;
export type DummyJsonProductParsed = z.infer<typeof DummyJsonProductSchema>;
export type DummyJsonProductsResponseParsed = z.infer<typeof DummyJsonProductsResponseSchema>;
