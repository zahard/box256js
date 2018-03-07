
class commandValidator {

  validate(cmd, A, B, C) {
    if (this['validate'+ cmd]) {
      return this['validate'+ cmd](A,B,C);
    }
    return false
  }

  isRef(byte) {
    if (byte[0] !== '@' && byte[0] !== '*') {
      return false;
    }
    return true;
  }

  validateADD(a,b,c) {
    if (! this.isRef(a)) {
       return false;
    }

    return 'FF';
  }

  validateMOV(a,b) {
    if (! this.isRef(b)) {
       return false;
    }
    return 'FF';
  }

  validatePIX(a,b) {
    return 'FF';
  }

  validateJMP(a) {
    return 'FF'
  }

}

