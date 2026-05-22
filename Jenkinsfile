pipeline {
    agent any

    environment {
        APP_NAME = "sipeta"
    }

    stages {

        stage('Clone Repository') {
            steps {
                git branch: 'main',
                url: 'https://github.com/USERNAME/sipeta.git'
            }
        }

        stage('Build Backend') {
            steps {
                sh 'docker compose build backend'
            }
        }

        stage('Build Frontend') {
            steps {
                sh 'docker compose build frontend'
            }
        }

        stage('Deploy') {
            steps {
                sh 'docker compose down'
                sh 'docker compose up -d'
            }
        }

        stage('Cleanup') {
            steps {
                sh 'docker image prune -f'
            }
        }
    }
}
