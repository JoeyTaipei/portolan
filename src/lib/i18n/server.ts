import { cookies } from "next/headers";
import { cache } from "react";
import { LANG_COOKIE, makeT, toLocale, type Locale, type T } from "./index";

// Server side of SHELL-4. Reading the cookie is runtime data: call these inside a <Suspense>.

export async function getLocale(): Promise<Locale> {
  return toLocale((await cookies()).get(LANG_COOKIE)?.value);
}

export const getT = cache(async (): Promise<T> => makeT(await getLocale()));
