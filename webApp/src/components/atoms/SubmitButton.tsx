import Button from "./Button";

interface Props {
  loading: boolean;
  label: string;
  loadingLabel?: string;
}

export default function SubmitButton({ loading, label, loadingLabel = "Un momento…" }: Props) {
  return (
    <Button type="submit" full disabled={loading} aria-busy={loading} className="mt-2">
      {loading ? loadingLabel : label}
    </Button>
  );
}
