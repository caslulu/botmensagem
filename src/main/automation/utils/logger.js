class Logger {
  constructor(emitter, profile = null) {
    this.emitter = emitter;
    this.profile = profile;
  }

  setProfile(profile) {
    this.profile = profile;
  }

  log(message) {
    const prefix = this.profile ? `[${this.profile.name}] ` : '';
    const fullMessage = `${prefix}${message}`;
    
    if (this.emitter) {
      this.emitter.emit('log', fullMessage);
    }
    
    console.log(fullMessage);
  }

  error(message, error) {
    const errorMessage = error ? `${message}: ${error.message}` : message;
    this.log(`❌ ERRO: ${errorMessage}`);
  }

  info(message) {
    this.log(`ℹ️  ${message}`);
  }

  success(message) {
    this.log(`✅ ${message}`);
  }

  warn(message) {
    this.log(`⚠️  ${message}`);
  }
}

module.exports = Logger;
