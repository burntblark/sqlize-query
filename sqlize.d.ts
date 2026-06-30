export interface Options {
  blacklist?: string[];
}

export interface Result {
  where: Record<string, any>;
}

export declare function retrieveWhere(
  whereStr: string | null | undefined,
  options?: Options
): Result | undefined;
