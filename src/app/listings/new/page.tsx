import { ListingForm } from "@/components/listing-form";

export default function NewListingPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Create New Listing</h1>
        <p className="text-muted-foreground text-sm">
          Add your product details and let AI optimize it for every platform.
        </p>
      </div>
      <div className="bg-card rounded-2xl border-0 shadow-sm p-6 md:p-8">
        <ListingForm />
      </div>
    </div>
  );
}
