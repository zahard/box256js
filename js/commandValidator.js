
class commandValidator {

  validate(cmd, A, B, C) {
    if (this['validate'+ cmd]) {
      return this['validate'+ cmd](A,B,C);
    }
    return false
  }


  validateADD(a,b,c) {
    console.log(a,b,c)
  }

}

