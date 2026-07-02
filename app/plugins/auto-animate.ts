import { createVAutoAnimate } from "@formkit/auto-animate/vue";

const autoAnimateOptions = {
  duration: 180,
  easing: "cubic-bezier(0.22, 1, 0.36, 1)",
};

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive(
    "auto-animate",
    import.meta.client
      ? createVAutoAnimate(autoAnimateOptions)
      : {
          getSSRProps: () => ({}),
        },
  );
});
