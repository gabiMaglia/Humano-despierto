interface Props {
  loading: boolean;
  label: string;
  loadingLabel?: string;
}

export default function SubmitButton({ loading, label, loadingLabel = "Un momento…" }: Props) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="btn-ritual btn-ritual-primary mt-2 w-full rounded-ritual disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? loadingLabel : label}
    </button>
  );
}
