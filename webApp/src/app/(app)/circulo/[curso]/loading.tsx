export default function CampusCourseLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" aria-busy="true">
      <p role="status" className="text-base text-suave">
        Abriendo el hilo…
      </p>
    </div>
  );
}
