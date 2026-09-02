import { requireAccessTokenSubject } from "../_shared/auth.ts";
import { optionsResponse, response } from "../_shared/response.ts";
import { supabase } from "../_shared/supabase.ts";

type CourseRow = {
  id: string;
} & Record<string, unknown>;

type GalleryRow = {
  id: string;
  source_id: string;
  name: string;
  link: string;
  type: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return optionsResponse(req);
  }

  if (req.method !== "GET") {
    return response(
      405,
      { error: "Method not allowed" },
      "METHOD_NOT_ALLOWED",
      req,
    );
  }

  try {
    const accessTokenSubject = await requireAccessTokenSubject(req);
    if (accessTokenSubject instanceof Response) {
      return accessTokenSubject;
    }

    const { data: courses, error } = await supabase
      .from("course")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      return response(500, { error: error.message }, "DATABASE_ERROR", req);
    }

    const courseRows = (courses ?? []) as CourseRow[];
    const courseIds = courseRows.map((course) => course.id);

    if (courseIds.length === 0) {
      return response(200, { courses: [] }, undefined, req);
    }

    const { data: galleries, error: galleryError } = await supabase
      .from("gallery")
      .select("id, source_id, name, link, type")
      .eq("type", "course")
      .in("source_id", courseIds);

    if (galleryError) {
      return response(500, { error: galleryError.message }, "DATABASE_ERROR", req);
    }

    const galleriesByCourseId = new Map<string, GalleryRow[]>();

    for (const gallery of (galleries ?? []) as GalleryRow[]) {
      const courseGalleries = galleriesByCourseId.get(gallery.source_id) ?? [];
      courseGalleries.push(gallery);
      galleriesByCourseId.set(gallery.source_id, courseGalleries);
    }

    return response(200, {
      courses: courseRows.map((course) => ({
        ...course,
        galleries: galleriesByCourseId.get(course.id) ?? [],
      })),
    }, undefined, req);
  } catch (err) {
    return response(
      500,
      {
        error: err instanceof Error ? err.message : "Internal server error",
      },
      "INTERNAL_SERVER_ERROR",
      req,
    );
  }
});
