import { redirect } from "next/navigation";
import { use } from "react";

export default function WardLinkPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    // Redirect to home with the ward name as a query parameter
    // 'slug' here refers to the path parameter [slug]
    redirect(`/?ward=${slug}`);
}
