import SimpleTrackerPage from "@/components/Trackers/SimpleTrackerPage";

type PageProps = {
    params: Promise<{
        trackerSlug: string;
    }>;
};

export default async function TrackerSlugPage({ params }: PageProps) {
    const { trackerSlug } = await params;

    return <SimpleTrackerPage trackerSlug={trackerSlug} />;
}