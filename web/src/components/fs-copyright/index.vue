<template>
  <div class="fs-copyright">
    <p>Copyright © 2015 - Present &nbsp;&nbsp;FISO Group LLC. All Rights Reserved.</p>
  </div>
</template>
<script lang="ts" setup></script>
<style lang="scss" scoped>
  @include b(copyright) {
    margin: auto;
    padding: 0 150px;
    box-sizing: border-box;
    p {
      border-top: 1px solid #000;
      font-size: 14px;
      line-height: 20px;
      color: #000000;
      padding: 25px 0 110px;
    }
  }
  @media screen and (max-width: 1300px) {
    @include b(copyright) {
      padding: 0 50px;
    }
  }

  .m {
    .fs-copyright {
      width: 100%;
      padding: 0 5px;
      padding-bottom: 20px;
      p {
        font-size: 12px;
        padding: 15px 0 20px;
        text-align: center;
      }
    }
  }
</style>
