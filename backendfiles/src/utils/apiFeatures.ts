import { Model, Query } from "mongoose";

export interface QueryString {
  page?: string;
  limit?: string;
  sort?: string;
  fields?: string;
  search?: string;
  [key: string]: any;
}

export class APIFeatures<T> {
  private model: Model<T>;
  private query: Query<T[], T>;
  private queryString: QueryString;

  private paginationInfo: {
    page: number;
    limit: number;
  } | null = null;

  constructor(model: Model<T>, queryString: QueryString) {
    this.model = model;
    this.queryString = queryString;
    this.query = model.find();
  }

  filter(): this {
    const queryObj = { ...this.queryString };
    const excludedFields = ["page", "limit", "sort", "fields", "search"];

    excludedFields.forEach((field) => delete queryObj[field]);

    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(
      /\b(gte|gt|lte|lt)\b/g,
      (match) => `$${match}`
    );

    this.query = this.query.find(JSON.parse(queryStr));
    return this;
  }

  search(fields: string[] = []): this {
    if (!this.queryString.search || !fields.length) return this;

    const searchQuery = {
      $or: fields.map((field) => ({
        [field]: {
          $regex: this.queryString.search,
          $options: "i",
        },
      })),
    };

    this.query = this.query.find(searchQuery);
    return this;
  }

  sort(): this {
    const sortBy = this.queryString.sort
      ? this.queryString.sort.split(",").join(" ")
      : "-createdAt";

    this.query = this.query.sort(sortBy);
    return this;
  }

  limitFields(): this {
    const fields = this.queryString.fields
      ? this.queryString.fields.split(",").join(" ")
      : "-__v";

    this.query = this.query.select(fields);
    return this;
  }

  paginate(maxLimit = 100): this {
    const page = Math.max(parseInt(this.queryString.page || "1", 10), 1);
    const limit = Math.min(
      parseInt(this.queryString.limit || "10", 10),
      maxLimit
    );

    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);

    this.paginationInfo = { page, limit };
    return this;
  }

  async exec() {
    const [results, total] = await Promise.all([
      this.query.exec(),
      this.model.countDocuments(this.query.getFilter()),
    ]);

    return {
      results,
      pagination: this.paginationInfo
        ? {
            ...this.paginationInfo,
            total,
            totalPages: Math.ceil(
              total / this.paginationInfo.limit
            ),
          }
        : null,
    };
  }
}
