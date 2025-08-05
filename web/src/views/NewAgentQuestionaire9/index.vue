<template>
  <div class="form-container">
    <h1 class="form-title">Electronic Fund Transfers (EFT)</h1>
    <form @submit.prevent="submitForm" class="space-y-5">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-for="(value, key) in form" :key="key">
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ key }}</label>
          <input
            v-model="form[key]"
            type="text"
            class="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
            :placeholder="key"
          />
        </div>
      </div>
      <div class="text-center pt-6">
        <button
          type="submit"
          class="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-md shadow-sm transition"
        >
          Submit
        </button>
      </div>
    </form>
  </div>
</template>

<script>
export default {
  data() {
    return {
      form: {
        "Account Owner Name": "",
        "Transit/ABA #": "",
        "Account #": "",
        "Financial Institution Name": "",
        "Branch Address": "",
        "City": "",
        "State": "",
        "Zip": "",
        "Account Type": "",
        "Phone": "",
        "Signature": "",
        "Date": "",
      },
    };
  },
  methods: {
    async submitForm() {
      try {
        const res = await fetch("/api/submit-eft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(this.form),
        });
        const result = await res.json();
        alert(result.message);
      } catch (e) {
        alert("Submission failed");
      }
    },
  },
};
</script>

<style scoped>
.form-container {
  @apply p-6 max-w-4xl mx-auto bg-white shadow-md rounded-md;
}

.form-title {
  @apply text-2xl font-bold text-gray-800 mb-6 text-center;
}
</style>
